import { Type, Static } from "@sinclair/typebox";

export const AuthorizationHeaderSchema = Type.Object({
  authorization: Type.String({
    minLength: 7,
    description: 'Authorization header in the format "Bearer <token>"',
  }),
});

export const UserPayloadSchema = Type.Object({
  id: Type.String(),
  role: Type.String(),
});

export type AuthorizationHeader = Static<typeof AuthorizationHeaderSchema>;
export type UserPayloadContract = Static<typeof UserPayloadSchema>;
