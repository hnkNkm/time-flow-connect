import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/DashboardLayout.css";

const DashboardLayout: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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
          <h1 className="app-title">TimeFlow</h1>
        </div>
        <div className="header-right">
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
            <ul>
              <li
                className={
                  location.pathname === "/attendance/form" ? "active" : ""
                }
              >
                <Link to="/attendance/form" onClick={handleMenuClick}>
                  <span className="material-icons">schedule</span>
                  勤怠申請
                </Link>
              </li>
              <li
                className={
                  location.pathname === "/attendance/list" ? "active" : ""
                }
              >
                <Link to="/attendance/list" onClick={handleMenuClick}>
                  <span className="material-icons">list</span>
                  勤怠一覧
                </Link>
              </li>
              <li
                className={
                  location.pathname === "/attendance/monthly" ? "active" : ""
                }
              >
                <Link to="/attendance/monthly" onClick={handleMenuClick}>
                  <span className="material-icons">calendar_month</span>
                  月間勤怠
                </Link>
              </li>
              <li className={location.pathname === "/shift" ? "active" : ""}>
                <Link to="/shift" onClick={handleMenuClick}>
                  <span className="material-icons">event_note</span>
                  シフト管理
                </Link>
              </li>
              <li
                className={
                  location.pathname.startsWith("/payslips") &&
                  !location.pathname.includes("/management")
                    ? "active"
                    : ""
                }
              >
                <Link to="/payslips" onClick={handleMenuClick}>
                  <span className="material-icons">receipt_long</span>
                  給与明細
                </Link>
              </li>

              {isAdmin && (
                <>
                  <li
                    className={
                      location.pathname === "/team/monthly" ? "active" : ""
                    }
                  >
                    <Link to="/team/monthly" onClick={handleMenuClick}>
                      <span className="material-icons">group</span>
                      チーム月間勤怠
                    </Link>
                  </li>
                  <li
                    className={
                      location.pathname.startsWith("/employees") ? "active" : ""
                    }
                  >
                    <Link to="/employees" onClick={handleMenuClick}>
                      <span className="material-icons">manage_accounts</span>
                      社員管理
                    </Link>
                  </li>
                  <li
                    className={
                      location.pathname === "/payslips/management" ? "active" : ""
                    }
                  >
                    <Link to="/payslips/management" onClick={handleMenuClick}>
                      <span className="material-icons">calculate</span>
                      給与計算管理
                    </Link>
                  </li>
                </>
              )}
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
