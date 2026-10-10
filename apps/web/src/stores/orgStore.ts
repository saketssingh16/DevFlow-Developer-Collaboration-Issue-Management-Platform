import { create } from 'zustand';
import { OrgRole } from '@devflow/shared';

export interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  role: OrgRole;
}

interface OrgStore {
  organizations: OrganizationItem[];
  currentOrg: OrganizationItem | null;
  setOrganizations: (orgs: OrganizationItem[]) => void;
  setCurrentOrg: (org: OrganizationItem | null) => void;
}

export const useOrgStore = create<OrgStore>((set) => ({
  organizations: [],
  currentOrg: null,
  setOrganizations: (organizations) =>
    set((state) => ({
      organizations,
      currentOrg: state.currentOrg || organizations[0] || null
    })),
  setCurrentOrg: (currentOrg) => set({ currentOrg })
}));
