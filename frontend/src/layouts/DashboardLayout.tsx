import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { menuItems } from "../config/menuConfig";
import { MenuItem } from "../types/navigation";
import QuickAttendance from "../components/QuickAttendance";
import NotificationBadge from "../components/NotificationBadge";
import "../styles/DashboardLayout.css";

const DashboardLayout: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['attendance', 'payroll']);

  // 画面サイズの変更を検知
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // 現在のパスに基づいてメニューを自動展開
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/attendance') || path.startsWith('/team')) {
      if (!expandedMenus.includes('attendance')) {
        setExpandedMenus(prev => [...prev, 'attendance']);
      }
    } else if (path.startsWith('/payslips')) {
      if (!expandedMenus.includes('payroll')) {
        setExpandedMenus(prev => [...prev, 'payroll']);
      }
    } else if (path.startsWith('/employees')) {
      if (!expandedMenus.includes('management')) {
        setExpandedMenus(prev => [...prev, 'management']);
      }
    }
  }, [location.pathname]);

  // ログアウト処理
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // メニューの開閉
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // モバイル時にメニュー選択後に閉じる
  const handleMenuClick = () => {
    if (isMobile) {
      setMenuOpen(false);
    }
  };

  // メニューの展開/折りたたみ
  const toggleMenuExpand = (menuId: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  // メニュー項目のレンダリング
  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    // 管理者限定メニューの表示制御
    if (item.adminOnly && !isAdmin) {
      return null;
    }

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.id);
    const isActive = item.path ? location.pathname === item.path : false;
    const isChildActive = hasChildren && item.children.some(child => 
      child.path && location.pathname === child.path
    );

    return (
      <li 
        key={item.id} 
        className={`menu-item level-${level} ${isActive || isChildActive ? 'active' : ''} ${isExpanded ? 'expanded' : ''}`}
        data-menu-id={item.id}
      >
        {hasChildren ? (
          <>
            <button
              className="menu-toggle-item"
              onClick={() => toggleMenuExpand(item.id)}
              aria-expanded={isExpanded}
              aria-controls={`submenu-${item.id}`}
            >
              <span className="menu-icon">
                <span className="material-icons">{item.icon}</span>
              </span>
              <span className="menu-label">{item.label}</span>
              <span className="menu-arrow">
                <span className="material-icons">
                  {isExpanded ? 'expand_less' : 'expand_more'}
                </span>
              </span>
            </button>
            {isExpanded && (
              <ul className="submenu" id={`submenu-${item.id}`}>
                {item.children.map(child => renderMenuItem(child, level + 1))}
              </ul>
            )}
          </>
        ) : (
          <Link to={item.path || '#'} onClick={handleMenuClick}>
            <span className="menu-icon">
              <span className="material-icons">{item.icon}</span>
            </span>
            <span className="menu-label">{item.label}</span>
          </Link>
        )}
      </li>
    );
  };

  return (
    <div className="dashboard-layout">
      <header className="header">
        <div className="header-left">
          <button
            className="menu-toggle"
            onClick={toggleMenu}
            aria-label="メニュー"
          >
            <span className="material-icons">menu</span>
          </button>
          <h1 className="app-title">勤怠管理システム</h1>
        </div>
        <div className="header-right">
          <div className="quick-actions">
            <QuickAttendance variant="icon" />
            {isAdmin && <NotificationBadge />}
          </div>
          <div className="user-info">
            <span className="user-name hidden-sm">
              {user?.full_name || "ユーザー"}
            </span>
            <button className="logout-button" onClick={handleLogout}>
              <span className="material-icons">logout</span>
              <span className="hidden-sm">ログアウト</span>
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
          {isMobile && (
            <div className="mobile-sidebar-header">
              <button className="close-menu" onClick={toggleMenu}>
                <span className="material-icons">close</span>
              </button>
              <div className="mobile-user-info">
                <span className="user-name">
                  {user?.full_name || "ユーザー"}
                </span>
              </div>
            </div>
          )}
          <nav className="sidebar-nav">
            <ul className="menu-list">
              {menuItems.map(item => renderMenuItem(item))}
            </ul>
          </nav>
        </aside>

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {menuOpen && isMobile && (
        <div className="overlay" onClick={toggleMenu}></div>
      )}
    </div>
  );
};

export default DashboardLayout;
