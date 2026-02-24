import * as v from "valibot";

export const UserRoleSchema = v.picklist(
  ["farmer", "restaurant"],
  "Role must be 'farmer' or 'restaurant'"
);

const UserRoleResponseSchema = v.picklist(
  ["farmer", "restaurant", "admin"],
  "Role must be 'farmer', 'restaurant', or 'admin'"
);

export const UserRegisterSchema = v.object({
  role: UserRoleSchema,
  email: v.optional(v.string()),
  name: v.optional(v.string()),
});

export type UserRegisterInput = v.InferOutput<typeof UserRegisterSchema>;

const BaseUserSchema = v.object({
  _id: v.string(),
  name: v.string(),
  email: v.string(),
  role: UserRoleResponseSchema,
  auth0Id: v.string(),
  createdAt: v.string(),
});

export const UserResponseSchema = BaseUserSchema;

export const PublicUserResponseSchema = v.pick(BaseUserSchema, [
  "_id",
  "name",
  "email",
  "role",
  "createdAt",
]);

export const UserListResponseSchema = v.array(PublicUserResponseSchema);
