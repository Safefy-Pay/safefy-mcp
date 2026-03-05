import { z } from "zod";

export const paymentMethodSchema = z.enum(["pix", "credit_card", "boleto"]);
export const httpMethodSchema = z.enum(["GET", "POST", "PATCH"]);
export const transactionStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "cancelled",
  "expired",
  "failed",
  "refunded",
  "partially_refunded",
]);
export const payoutStatusSchema = z.enum([
  "pending",
  "approved",
  "processing",
  "confirming",
  "completed",
  "failed",
  "rejected",
  "cancelled",
]);

export const customerStatusSchema = z.enum(["active", "inactive"]);
export const customerDocumentTypeSchema = z.enum(["cpf", "cnpj"]);
export const productStatusSchema = z.enum(["active", "inactive", "archived"]);
export const productTypeSchema = z.enum(["product", "service", "digital"]);
export const simulateCashoutActionSchema = z.enum(["complete", "fail", "reject"]);

export const isoDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .describe("ISO 8601 datetime. Ex: 2026-03-04T12:30:00Z");
