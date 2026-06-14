/** Lightweight option shapes passed from server pages to client forms/filters. */
import type { CategoryType } from "@prisma/client";

export interface AccountOption {
  id: string;
  name: string;
  currency: string;
}

export interface CategoryOption {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
}
