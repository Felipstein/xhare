mod discovery;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
