// cspell:ignore typebox
import { Static, TSchema, Type } from "@sinclair/typebox";

export const ApiErrorBodySchema = Type.Object({
  code: Type.String(),
  message: Type.String(),
  details: Type.Optional(Type.Unknown()),
});

export const ApiSuccessExampleSchema = Type.Object({
  success: Type.Literal(true),
  data: Type.Record(Type.String(), Type.Unknown()),
});

export const ApiErrorResponseSchema = Type.Object({
  success: Type.Literal(false),
  error: ApiErrorBodySchema,
});

export const ApiSuccessResponseSchema = <T extends TSchema>(dataSchema: T) =>
  Type.Object({
    success: Type.Literal(true),
    data: dataSchema,
  });

export const RequestIdHeaderSchema = Type.Object({
  "x-request-id": Type.Optional(
    Type.String({
      minLength: 1,
      description: "Optional request correlation id",
    }),
  ),
});

export type ApiErrorBody = Static<typeof ApiErrorBodySchema>;
export type ApiErrorResponse = Static<typeof ApiErrorResponseSchema>;
export type RequestIdHeader = Static<typeof RequestIdHeaderSchema>;

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};
