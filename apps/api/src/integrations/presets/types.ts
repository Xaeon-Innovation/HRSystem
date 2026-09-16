import type { CanonicalTargetEntity } from "@hr/shared";

export type PresetFieldMapping = {
  sourceEntity: string;
  sourceField: string;
  targetEntity: CanonicalTargetEntity;
  targetField: string;
  transformType?: "direct" | "number_parse" | "date_parse";
  isRequired?: boolean;
};

export type ConnectorPackAuthField = {
  name: "username" | "password" | "apiKey";
  label: string;
  inputType: "text" | "password" | "tel" | "url";
  placeholder?: string;
  required?: boolean;
};

export type ConnectorPackOAuth = {
  provider: string;
  scopes: string[];
  authorizeUrl: string;
  tokenUrl: string;
  /** process.env key for client id */
  clientIdEnv: string;
  /** process.env key for client secret */
  clientSecretEnv: string;
};
