mod discovery;
mod lan_scan;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            discovery::get_devices,
            discovery::add_device_by_ip,
            discovery::remove_device,
            discovery::probe_device,
            discovery::get_local_ip,
        ])
        .setup(|app| {
            discovery::setup(app);
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            discovery::shutdown();
        }
    });
}
