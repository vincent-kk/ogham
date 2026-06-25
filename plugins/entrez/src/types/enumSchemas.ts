/**
 * @file enumSchemas.ts
 * @description Zod mirrors of the `as const` enums (via `z.nativeEnum`, which
 * preserves the value-union type). Schemas live here so config/record/manifest
 * reuse one definition instead of re-declaring literals.
 */
import { z } from "zod";

import {
  Db,
  SortOrder,
  DateType,
  DateField,
  RecordField,
  QueryRole,
  Breadth,
  MeshMatch,
  FulltextFormat,
  UnavailableReason,
  OaStatus,
  RateLimit,
  FetchMode,
  CapStrategy,
  JobStatus,
  ExpansionSource,
  IntentType,
  ExecutionMode,
  ErrorCode,
} from "./enums.js";

export const DbSchema = z.nativeEnum(Db);
export const SortOrderSchema = z.nativeEnum(SortOrder);
export const DateTypeSchema = z.nativeEnum(DateType);
export const DateFieldSchema = z.nativeEnum(DateField);
export const RecordFieldSchema = z.nativeEnum(RecordField);
export const QueryRoleSchema = z.nativeEnum(QueryRole);
export const BreadthSchema = z.nativeEnum(Breadth);
export const MeshMatchSchema = z.nativeEnum(MeshMatch);
export const FulltextFormatSchema = z.nativeEnum(FulltextFormat);
export const UnavailableReasonSchema = z.nativeEnum(UnavailableReason);
export const OaStatusSchema = z.nativeEnum(OaStatus);
export const RateLimitSchema = z.nativeEnum(RateLimit);
export const FetchModeSchema = z.nativeEnum(FetchMode);
export const CapStrategySchema = z.nativeEnum(CapStrategy);
export const JobStatusSchema = z.nativeEnum(JobStatus);
export const ExpansionSourceSchema = z.nativeEnum(ExpansionSource);
export const IntentTypeSchema = z.nativeEnum(IntentType);
export const ExecutionModeSchema = z.nativeEnum(ExecutionMode);
export const ErrorCodeSchema = z.nativeEnum(ErrorCode);
