export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path?: string;
  children?: MenuItem[];
  adminOnly?: boolean;
}

export interface MenuSection {
  items: MenuItem[];
}