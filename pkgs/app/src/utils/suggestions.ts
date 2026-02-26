/**
 * Rule-based inline suggestion engine (v0).
 *
 * All suggestions are deterministic template completions — no LLM calls, no
 * hallucinated facts. Each rule fires only when its conditions are clearly met
 * so the ghost text is always a plausible, low-risk continuation.
 *
 * Extension: pass a different getSuggestion function tailored to the field
 * (offer message, chat composer, etc.) using the same SuggestionContext shape.
 */

export interface SuggestionContext {
  itemName?: string
  qty?: string
  unit?: string
  price?: string
  priceUnit?: string
}

// Patterns used to detect whether a topic has already been covered.
const HAS_QUANTITY = /\b\d+\b/
// "fresh" intentionally excluded: it is too generic (almost every description
// starts with "Fresh X") and would block the quality suggestion for the
// majority of users. More specific quality terms still apply.
const HAS_QUALITY = /\b(quality|organic|ripe|seasonal|variety|grade|harvested|heirloom|locally.grown|home.grown|vine.ripened)\b/i
const HAS_LOGISTICS = /\b(pickup|pick.?up|delivery|deliver|available|collection|ship)\b/i
// Literal placeholder text produced by the AI draft generator that the user
// still needs to replace with their actual pickup window.
const IS_DRAFT_PLACEHOLDER = /Message for pickup|pickup window/i

/**
 * Returns a ghost-text suffix to append to `text`, or null when no suggestion
 * is useful. Designed for the NewListing description textarea.
 *
 * Triggering rules:
 *  - Empty text → full starter sentence (context-aware).
 *  - Text that ends after a completed word boundary (space / punctuation) +
 *    a missing detail → one short sentence covering that detail.
 *  - Mid-word text → null (never interrupt while the user is typing a word).
 */
export function getListingDescriptionSuggestion(
  text: string,
  ctx: SuggestionContext
): string | null {
  const trimmed = text.trimEnd()

  // ── Rule 0: empty field ─────────────────────────────────────────────────
  if (trimmed.length === 0) {
    if (ctx.itemName) {
      const qtyPart =
        ctx.qty && ctx.unit ? ` ${ctx.qty} ${ctx.unit} available this week.` : ""
      return `Fresh ${ctx.itemName}, locally grown.${qtyPart}`
    }
    return "Freshly harvested local produce, available this week."
  }

  // Rules below each prepend a space for natural word separation mid-word.

  // ── Rule 1: quantity not yet mentioned ──────────────────────────────────
  if (trimmed.length > 5 && !HAS_QUANTITY.test(trimmed) && ctx.qty && ctx.unit) {
    return ` ${ctx.qty} ${ctx.unit} available.`
  }

  // ── Rule 2: quality not yet mentioned ───────────────────────────────────
  if (trimmed.length > 5 && !HAS_QUALITY.test(trimmed)) {
    return " Locally grown, excellent quality."
  }

  // ── Rule 3: logistics not yet mentioned ─────────────────────────────────
  if (trimmed.length > 15 && !HAS_LOGISTICS.test(trimmed)) {
    return " Available for pickup or local delivery."
  }

  // ── Rule 4: AI-draft placeholder not yet replaced ───────────────────────
  // Fires only while the literal "Message for pickup" / "pickup window" text
  // from the generated draft is still present; disappears once the user
  // replaces it with their actual schedule, OR once they have already accepted
  // this suggestion (so it doesn't re-fire after Tab).
  if (
    IS_DRAFT_PLACEHOLDER.test(trimmed) &&
    !/Contact us to arrange a pickup time/i.test(trimmed)
  ) {
    return " Contact us to arrange a pickup time."
  }

  return null
}

/**
 * Extended context for the chat composer. Carries listing and response details
 * so suggestions stay grounded in the actual negotiation being discussed.
 */
export interface ChatSuggestionContext extends SuggestionContext {
  /** Full listing title, e.g. "Fresh Tomatoes from Green Farm" */
  listingTitle?: string
  /** Full listing description — scanned for pickup time mentions. */
  listingDescription?: string
  /** Offered price from the buyer/seller response */
  responsePrice?: string
  /** Offered quantity from the buyer/seller response */
  responseQty?: string
  /** True when the thread has no messages yet (first opener). */
  isNewThread?: boolean
  /**
   * True when the current user is the one who submitted the response/offer.
   * False (or undefined) means the current user is the listing owner.
   * Controls which opener template is shown on a brand-new thread:
   *  - responder  → follow-up on their own offer
   *  - listing owner → acknowledge the incoming offer
   */
  isResponder?: boolean
}

const HAS_PRICE = /\$[\d.]+|\bprice\b|\bper\b|\bcost\b|\brate\b|\bhow.?much\b/i
const HAS_SCHEDULE = /\bwhen\b|\btime\b|\bschedule\b|\bwindow\b|\bday\b|\bweek\b|\bmorning\b|\bafternoon\b/i

/**
 * Returns true when the description mentions pickup, collection, or delivery
 * in any form — even without specifying a concrete time.
 * Used to decide whether to prompt the responder about the pickup window.
 */
function hasPickupMention(description: string): boolean {
  return /\b(pickup|pick.?up|collection|collect|deliver|delivery|available for)\b/i.test(
    description
  )
}

/**
 * Tries to pull a concise pickup-time phrase out of a listing description.
 * Looks for sentences / clauses that mention a pickup/collection keyword AND
 * a concrete day or time, and returns the first match trimmed to ≤80 chars.
 * Returns null when the description mentions pickup but gives no specific time.
 *
 * Examples of matched text:
 *   "Available for pickup Thursday mornings 8–11am"
 *   "Pickup Saturdays between 9am and noon"
 *   "Collection available Tuesday to Friday, 7am–2pm"
 */
function extractPickupTime(description: string): string | null {
  // Requires BOTH a pickup keyword AND a concrete day/time indicator
  const sentenceRe =
    /[^.!?\n]*\b(pickup|pick.?up|collection|collect|available)\b[^.!?\n]*\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|morning|afternoon|evening|\d{1,2}:\d{2}|\d{1,2}\s*am|\d{1,2}\s*pm)\b[^.!?\n]*/gi
  const match = sentenceRe.exec(description)
  if (!match) return null
  const phrase = match[0].trim()
  return phrase.length > 80 ? phrase.slice(0, 77) + "…" : phrase
}

/**
 * Suggestion function for the chat composer inside a listing thread.
 * Suggestions are grounded in the listing details (title, item, price, qty)
 * and any existing response offer so ghost text always reflects real context.
 *
 * Triggering rules:
 *  - Empty field on a brand-new thread → context-aware opener.
 *  - Empty field mid-conversation → no suggestion (avoid interrupting flow).
 *  - After a word boundary: prompt for the next un-covered topic
 *    (logistics → price → schedule).
 *  - Mid-word → null.
 */
export function getChatSuggestion(
  text: string,
  ctx: ChatSuggestionContext
): string | null {
  const trimmed = text.trimEnd()

  // ── Rule 0: empty field ─────────────────────────────────────────────────
  if (trimmed.length === 0) {
    if (!ctx.isNewThread) return null

    const unitLabel = ctx.unit ?? "units"
    const pickupTime = ctx.listingDescription
      ? extractPickupTime(ctx.listingDescription)
      : null
    const pickupMentioned = ctx.listingDescription
      ? hasPickupMention(ctx.listingDescription)
      : false

    if (ctx.isResponder) {
      // Current user submitted the response/offer — open with a follow-up on it.
      if (ctx.listingTitle && ctx.responseQty && ctx.responsePrice) {
        const closer = pickupTime
          ? ` Does "${pickupTime}" work for the pickup?`
          : pickupMentioned
          ? " Could you let me know your available pickup window?"
          : " Looking forward to connecting!"
        return `Hi! I sent an offer for your ${ctx.listingTitle} — ${ctx.responseQty} ${unitLabel} at $${ctx.responsePrice}.${closer}`
      }
      if (ctx.listingTitle) {
        return `Hi! I'm following up on my offer for your ${ctx.listingTitle} listing.`
      }
      return `Hi! I'm following up on my offer.`
    } else {
      // Current user owns the listing — open by acknowledging the incoming offer.
      if (ctx.responseQty && ctx.responsePrice && ctx.itemName) {
        return `Thanks for your interest in ${ctx.itemName}! Your offer of ${ctx.responseQty} ${unitLabel} at $${ctx.responsePrice} looks great.`
      }
      if (ctx.listingTitle && ctx.responsePrice) {
        return `Thanks for reaching out about the ${ctx.listingTitle} listing! Your offer of $${ctx.responsePrice} looks interesting.`
      }
      if (ctx.listingTitle) {
        return `Thanks for reaching out about the ${ctx.listingTitle} listing! Happy to chat.`
      }
      return `Thanks for your offer! Happy to discuss the details.`
    }
  }

  // Rules below fire only at word/sentence boundaries.
  const lastChar = text.slice(-1)
  if (!/[\s.,!?;:]/.test(lastChar)) return null

  // ── Rule 1: logistics not yet mentioned ─────────────────────────────────
  if (!HAS_LOGISTICS.test(trimmed)) {
    return " What's your preferred pickup location and time?"
  }

  // ── Rule 2: price not yet discussed ─────────────────────────────────────
  if (!HAS_PRICE.test(trimmed) && ctx.price) {
    const perPart = ctx.priceUnit ? `/${ctx.priceUnit}` : ""
    return ` Does $${ctx.price}${perPart} work for you?`
  }

  // ── Rule 3: schedule not yet discussed ──────────────────────────────────
  if (!HAS_SCHEDULE.test(trimmed)) {
    return " What time works best for you?"
  }

  return null
}

/**
 * Suggestion function for a plain text message / offer composer.
 * Provides scaffolding prompts for the most common missing logistics details.
 */
export function getMessageSuggestion(
  text: string,
  ctx: SuggestionContext
): string | null {
  const trimmed = text.trimEnd()

  if (trimmed.length === 0) {
    if (ctx.itemName && ctx.qty && ctx.unit) {
      return `Hi, I'm looking for ${ctx.qty} ${ctx.unit} of ${ctx.itemName}.`
    }
    if (ctx.itemName) {
      return `Hi, I'm interested in your ${ctx.itemName} listing.`
    }
    return "Hi, I'm interested in this listing."
  }

  const lastChar = text.slice(-1)
  if (!/[\s.,!?;:]/.test(lastChar)) return null

  if (!HAS_LOGISTICS.test(trimmed)) {
    return " Is pickup or delivery available, and what's your preferred time window?"
  }

  if (!HAS_QUANTITY.test(trimmed) && ctx.qty && ctx.unit) {
    return ` I need ${ctx.qty} ${ctx.unit}.`
  }

  return null
}
