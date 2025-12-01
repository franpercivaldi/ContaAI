import { Organization } from '@prisma/client';

const CUIT_MAP: Record<string, Organization> = {
  '30668155541': Organization.OBRA_SOCIAL,
  '30557363072': Organization.AOITA,
  '30717180999': Organization.MUTUAL,
};

export function mapCuitToOrganization(cuit?: string | null): Organization {
  if (!cuit) return Organization.DESCONOCIDA;
  const normalized = cuit.replace(/\D/g, '');
  return CUIT_MAP[normalized] ?? Organization.DESCONOCIDA;
}

export default mapCuitToOrganization;
