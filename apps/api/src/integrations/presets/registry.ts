import type { IntegrationConnectorConfig } from "@hr/db";
import type { IntegrationProviderType } from "@hr/shared";
import {
  CREATIVE_CMS_GOALS_DEFAULT_BASE_URL,
  CREATIVE_CMS_GOALS_PRESET,
  creativeCmsGoalsConnectorConfig,
  creativeCmsGoalsMappings,
} from "./creative-cms-goals.js";
import {
  HUBSPOT_CRM_DEFAULT_BASE_URL,
  HUBSPOT_CRM_PRESET,
  hubspotCrmConnectorConfig,
  hubspotCrmMappings,
} from "./hubspot-crm.js";
import type {
  ConnectorPackAuthField,
  ConnectorPackOAuth,
  PresetFieldMapping,
} from "./types.js";

export type ConnectorPack = {
  id: string;
  providerType: IntegrationProviderType;
  label: string;
  description: string;
  implemented: boolean;
  comingSoon?: boolean;
  authStrategy: "cms_jwt" | "oauth2" | "api_key" | "none";
  authFields?: ConnectorPackAuthField[];
  defaultBaseUrl?: string;
  defaultName: string;
  connectorConfig: IntegrationConnectorConfig;
  mappings: PresetFieldMapping[];
  oauth?: ConnectorPackOAuth;
  pollIntervalMinutes?: number;
};

const cmsGoalsPack: ConnectorPack = {
  id: CREATIVE_CMS_GOALS_PRESET,
  providerType: "cms",
  label: "CMS Goals",
  description:
    "Connect your CMS so employee goals flow into Analytics. Enter a service account; we handle login, tokens, endpoints, and field mappings.",
  implemented: true,
  authStrategy: "cms_jwt",
  authFields: [
    {
      name: "username",
      label: "Service account phone",
      inputType: "tel",
      placeholder: "+9715XXXXXXXX",
      required: true,
    },
    {
      name: "password",
      label: "Password",
      inputType: "password",
      required: true,
    },
  ],
  defaultBaseUrl: CREATIVE_CMS_GOALS_DEFAULT_BASE_URL,
  defaultName: "CMS Goals",
  connectorConfig: creativeCmsGoalsConnectorConfig,
  mappings: creativeCmsGoalsMappings,
  pollIntervalMinutes: 15,
};

const hubspotCrmPack: ConnectorPack = {
  id: HUBSPOT_CRM_PRESET,
  providerType: "crm",
  label: "HubSpot CRM",
  description:
    "Pull HubSpot deals into Analytics. Sign in with HubSpot; we refresh tokens and map deals for you.",
  implemented: true,
  authStrategy: "oauth2",
  defaultBaseUrl: HUBSPOT_CRM_DEFAULT_BASE_URL,
  defaultName: "HubSpot CRM",
  connectorConfig: hubspotCrmConnectorConfig,
  mappings: hubspotCrmMappings,
  pollIntervalMinutes: 15,
  oauth: {
    provider: "hubspot",
    scopes: ["crm.objects.deals.read", "oauth"],
    authorizeUrl: "https://app.hubspot.com/oauth/authorize",
    tokenUrl: "https://api.hubapi.com/oauth/v1/token",
    clientIdEnv: "HUBSPOT_CLIENT_ID",
    clientSecretEnv: "HUBSPOT_CLIENT_SECRET",
  },
};

const erpComingSoon: ConnectorPack = {
  id: "erp_coming_soon",
  providerType: "erp",
  label: "ERP",
  description: "Connect ERP sales and operations data. Coming soon.",
  implemented: false,
  comingSoon: true,
  authStrategy: "none",
  defaultName: "ERP",
  connectorConfig: {},
  mappings: [],
};

export const CONNECTOR_PACKS: ConnectorPack[] = [
  cmsGoalsPack,
  hubspotCrmPack,
  erpComingSoon,
];

const byId = new Map(CONNECTOR_PACKS.map((p) => [p.id, p]));

export function getConnectorPack(id: string | undefined | null): ConnectorPack | undefined {
  if (!id) return undefined;
  return byId.get(id);
}

export function listImplementedPacks(): ConnectorPack[] {
  return CONNECTOR_PACKS.filter((p) => p.implemented);
}

export function isOAuthEnvConfigured(pack: ConnectorPack): boolean {
  if (!pack.oauth) return false;
  const id = process.env[pack.oauth.clientIdEnv]?.trim();
  const secret = process.env[pack.oauth.clientSecretEnv]?.trim();
  return Boolean(id && secret);
}

export function catalogPackPayload(pack: ConnectorPack) {
  return {
    id: pack.id,
    type: pack.providerType,
    label: pack.label,
    description: pack.description,
    implemented: pack.implemented,
    comingSoon: pack.comingSoon ?? false,
    authStrategy: pack.authStrategy,
    authFields: pack.authFields ?? [],
    defaultBaseUrl: pack.defaultBaseUrl ?? null,
    preset: pack.implemented ? pack.id : undefined,
    oauthConfigured:
      pack.authStrategy === "oauth2" ? isOAuthEnvConfigured(pack) : undefined,
  };
}
