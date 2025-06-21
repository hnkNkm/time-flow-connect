import { MenuItem } from "../types/navigation";

export const menuItems: MenuItem[] = [
  {
    id: "home",
    label: "ホーム",
    icon: "home",
    path: "/dashboard",
  },
  {
    id: "attendance",
    label: "勤怠",
    icon: "access_time",
    children: [
      {
        id: "attendance-form",
        label: "打刻",
        icon: "schedule",
        path: "/attendance/form",
      },
      {
        id: "attendance-list",
        label: "勤怠一覧",
        icon: "list",
        path: "/attendance/list",
      },
      {
        id: "attendance-monthly",
        label: "月間勤怠",
        icon: "calendar_month",
        path: "/attendance/monthly",
      },
      {
        id: "team-monthly",
        label: "チーム月間勤怠",
        icon: "group",
        path: "/team/monthly",
        adminOnly: true,
      },
    ],
  },
  {
    id: "leave",
    label: "休暇",
    icon: "event_busy",
    path: "/leave",
  },
  {
    id: "shift",
    label: "シフト",
    icon: "event_note",
    path: "/shift",
  },
  {
    id: "payroll",
    label: "給与",
    icon: "payments",
    children: [
      {
        id: "payslips",
        label: "給与明細",
        icon: "receipt_long",
        path: "/payslips",
      },
      {
        id: "payslips-management",
        label: "給与計算管理",
        icon: "calculate",
        path: "/payslips/management",
        adminOnly: true,
      },
    ],
  },
  {
    id: "management",
    label: "管理",
    icon: "settings",
    adminOnly: true,
    children: [
      {
        id: "employees",
        label: "社員管理",
        icon: "manage_accounts",
        path: "/employees",
      },
    ],
  },
];