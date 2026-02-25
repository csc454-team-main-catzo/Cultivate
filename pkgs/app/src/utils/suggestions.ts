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
