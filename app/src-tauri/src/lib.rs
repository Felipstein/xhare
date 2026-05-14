mod discovery;
mod lan_scan;
mod logger;
mod settings;
mod transfer;
mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    logger::init();

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            discovery::get_devices,
            discovery::add_device_by_ip,
            discovery::remove_device,
            discovery::probe_device,
            discovery::get_local_ip,
            discovery::get_default_download_folder,
            settings::load_settings,
            settings::save_settings,
            transfer::send_file,
            transfer::save_cached_file,
            transfer::discard_cached_file,
            transfer::save_clipboard_blob,
            transfer::read_clipboard_paths,
            transfer::copy_paths_to_clipboard,
            transfer::show_notification,
            transfer::open_path,
            transfer::reveal_path,
            logger::read_log_lines,
            logger::get_logs_dir,
            tray::set_unread_count,
        ])
        .setup(|app| {
            discovery::setup(app);
            transfer::setup(app);
            if let Err(e) = tray::setup(app) {
                log::warn!("tray setup failed: {e}");
            }

            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                // Closing the window hides it instead of exiting the process —
                // the app keeps living in the tray. Real exit comes from the
                // tray menu's "Sair" item, which calls AppHandle::exit(). On
                // macOS we also flip the activation policy so the dock icon
                // disappears while we're tray-only (Docker / Rectangle style).
                let w = window.clone();
                let handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = w.hide();
                        #[cfg(target_os = "macos")]
                        {
                            let _ = handle.set_activation_policy(tauri::ActivationPolicy::Accessory);
                        }
                        // Reference the handle on non-macOS too so the closure
                        // captures it on every platform (silences unused warns).
                        let _ = &handle;
                    }
                });

                #[cfg(target_os = "windows")]
                {
                    let _ = window.set_decorations(false);
                }
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            discovery::shutdown();
            transfer::clear_cache();
        }
    });
}
