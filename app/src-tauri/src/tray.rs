// Native tray icon (macOS menu bar / Windows system tray).
//
// Click on the icon: shows + focuses the main window.
// Right-click (or click on Windows): opens the menu with Show / Quit.
// Unread badge: frontend calls `set_unread_count` whenever the unread file
// count changes; on macOS we render that count as text next to the icon, on
// Windows we update the tooltip (the system tray doesn't natively support
// number badges).

use std::sync::OnceLock;

use tauri::menu::{Menu, MenuEvent, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Runtime};

static TRAY_ID: OnceLock<String> = OnceLock::new();
const TRAY_ID_VALUE: &str = "xhare-main-tray";

pub fn setup<R: Runtime>(app: &tauri::App<R>) -> Result<(), Box<dyn std::error::Error>> {
    let _ = TRAY_ID.set(TRAY_ID_VALUE.to_string());

    let show = MenuItem::with_id(app, "show", "Mostrar Xhare", true, None::<&str>)?;
    let separator = tauri::menu::PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &separator, &quit])?;

    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or("missing default window icon")?;

    TrayIconBuilder::with_id(TRAY_ID_VALUE)
        .icon(icon)
        .icon_as_template(true)
        .tooltip("Xhare")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(handle_menu_event)
        .on_tray_icon_event(handle_tray_event)
        .build(app)?;

    Ok(())
}

fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, event: MenuEvent) {
    match event.id.as_ref() {
        "show" => show_main_window(app),
        "quit" => app.exit(0),
        _ => {}
    }
}

fn handle_tray_event<R: Runtime>(tray: &TrayIcon<R>, event: TrayIconEvent) {
    if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    {
        show_main_window(tray.app_handle());
    }
}

fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    // Bring the dock icon back before showing — macOS won't focus the window
    // properly if it's still in Accessory mode.
    #[cfg(target_os = "macos")]
    {
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
    }
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

/// Update the tray to reflect how many unread files the feed currently has.
/// macOS gets a tiny dot/number next to the icon via `set_title`; on Windows
/// we settle for an updated tooltip since the system tray has no native badge.
#[tauri::command]
pub fn set_unread_count<R: Runtime>(app: AppHandle<R>, count: u32) -> Result<(), String> {
    let Some(id) = TRAY_ID.get() else { return Ok(()) };
    let Some(tray) = app.tray_by_id(id) else { return Ok(()) };

    #[cfg(target_os = "macos")]
    {
        let label = if count == 0 {
            String::new()
        } else if count > 99 {
            "99+".to_string()
        } else {
            count.to_string()
        };
        tray.set_title(Some(label)).map_err(|e| e.to_string())?;
    }

    let tooltip = if count == 0 {
        "Xhare".to_string()
    } else if count == 1 {
        "Xhare · 1 arquivo não lido".to_string()
    } else {
        format!("Xhare · {count} arquivos não lidos")
    };
    tray.set_tooltip(Some(tooltip)).map_err(|e| e.to_string())?;

    Ok(())
}
