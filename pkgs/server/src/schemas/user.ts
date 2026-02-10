import * as v from "valibot";

export const UserRoleSchema = v.picklist(
  ["farmer", "restaurant"],
  "Role must be 'farmer' or 'restaurant'"
);

export const UserRegisterSchema = v.object({
  role: UserRoleSchema,
});

export type UserRegisterInput = v.InferOutput<typeof UserRegisterSchema>;

const BaseUserSchema = v.object({
  _id: v.string(),
  name: v.string(),
  email: v.string(),
  role: UserRoleSchema,
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
