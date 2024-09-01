import os
import sys
import shutil
import ctypes
import platform
import json

print("")
print("Photoshop Plugin V1.9.3 Installing. . .")
print("")


plugin_path = os.path.dirname(os.path.abspath(__file__))


def get_plugin_version():
    try:
        manifest_path = os.path.join(plugin_path, "3e6d64e0", "manifest.json")
        with open(manifest_path, "r") as f:
            manifest = json.load(f)
        return manifest.get("version", "unknown")
    except Exception as e:
        print(f"Error reading version from manifest.json: {e}")
        return "unknown"


plugin_version = get_plugin_version()
plugin_folder_withVersion = "3e6d64e0" + "_" + plugin_version
plugin_folder = os.path.join(plugin_path, "3e6d64e0")


class MethodOne:
    def __init__(self):
        self.plugin_folder = plugin_folder
        self.system = platform.system()

    def is_admin(self):
        if self.system == "Windows":
            try:
                return ctypes.windll.shell32.IsUserAnAdmin()
            except Exception as e:
                print(f"Error checking admin status: {e}")
                return False
        return True

    def request_admin_privileges(self):
        if not self.is_admin():
            try:
                print("Requesting admin privileges...")
                params = " ".join([f'"{arg}"' for arg in sys.argv])
                ctypes.windll.shell32.ShellExecuteW(
                    None, "runas", sys.executable, params, None, 1
                )
                sys.exit()
            except Exception as e:
                print(f"Failed to request admin privileges: {e}")
                sys.exit(1)

    def find_photoshop_windows(self):
        import winreg

        def get_install_path(reg_key):
            try:
                install_path, _ = winreg.QueryValueEx(reg_key, "ApplicationPath")
                return install_path
            except FileNotFoundError:
                return None

        paths = [r"SOFTWARE\Adobe\Photoshop", r"SOFTWARE\Wow6432Node\Adobe\Photoshop"]

        for reg_path in paths:
            try:
                reg_key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, reg_path)
                num_subkeys, _, _ = winreg.QueryInfoKey(reg_key)
                for i in range(num_subkeys):
                    subkey_name = winreg.EnumKey(reg_key, i)
                    subkey_path = f"{reg_path}\\{subkey_name}"
                    subkey = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, subkey_path)
                    install_path = get_install_path(subkey)
                    if install_path:
                        return install_path
            except FileNotFoundError:
                continue

        return None

    def find_photoshop_mac(self):
        applications_dir = "/Applications"
        photoshop_dirs = [
            d for d in os.listdir(applications_dir) if "Adobe Photoshop" in d
        ]

        if photoshop_dirs:
            return os.path.join(applications_dir, photoshop_dirs[0])

        return None

    def copy_plugin(self, photoshop_path):
        plugins_dir = os.path.join(photoshop_path, "Plug-ins")
        if not os.path.exists(plugins_dir):
            os.makedirs(plugins_dir)
        destination = os.path.join(plugins_dir, os.path.basename(self.plugin_folder))
        try:
            if os.path.exists(destination):
                shutil.rmtree(destination)  # حذف فولدر موجود
            shutil.copytree(self.plugin_folder, destination)
            print(f"Method 2: installed in {destination}")
        except PermissionError as e:
            print(f"Permission Error: {e}")
            self.request_admin_privileges()
        except Exception as e:
            print(f"Failed to copy plugin folder: {e}")

    def execute(self):
        if not os.path.exists(self.plugin_folder):
            print(f"Plugin folder '{self.plugin_folder}' does not exist.")
            return

        if self.system == "Windows":
            photoshop_path = self.find_photoshop_windows()
        elif self.system == "Darwin":
            photoshop_path = self.find_photoshop_mac()
        else:
            print("Unsupported operating system.")
            return

        if photoshop_path:
            # print(f"Adobe Photoshop is installed at: {photoshop_path}")
            self.copy_plugin(photoshop_path)
        else:
            print("Adobe Photoshop is not installed.")


class MethodTwo:
    def __init__(self):
        self.plugin_folder = plugin_folder
        self.system = platform.system()

    def is_admin(self):
        if self.system == "Windows":
            try:
                return ctypes.windll.shell32.IsUserAnAdmin()
            except Exception as e:
                print(f"Error checking admin status: {e}")
                return False
        return True  # Default to True for non-Windows systems

    def request_admin_privileges(self):
        if self.system == "Windows" and not self.is_admin():
            try:
                print("Requesting admin privileges...")
                params = " ".join([f'"{arg}"' for arg in sys.argv])
                ctypes.windll.shell32.ShellExecuteW(
                    None, "runas", sys.executable, params, None, 1
                )
                sys.exit()
            except Exception as e:
                print(f"Failed to request admin privileges: {e}")
                sys.exit(1)

    def install_plugin(self):
        try:
            if self.system == "Windows":
                adobe_plugins_storage = os.path.expanduser(
                    r"~\AppData\Roaming\Adobe\UXP\Plugins\External"
                )
                plugins_info_path = os.path.expanduser(
                    r"~\AppData\Roaming\Adobe\UXP\PluginsInfo\v1"
                )
            elif self.system == "Darwin":
                adobe_plugins_storage = os.path.expanduser(
                    "~/Library/Application Support/Adobe/UXP/Plugins/External"
                )
                plugins_info_path = os.path.expanduser(
                    "~/Library/Application Support/Adobe/UXP/PluginsInfo/v1"
                )
            else:
                print("Unsupported operating system.")
                return

            os.makedirs(adobe_plugins_storage, exist_ok=True)
            os.makedirs(plugins_info_path, exist_ok=True)

            for folder_name in os.listdir(adobe_plugins_storage):
                if folder_name.startswith("3e6d64e0"):
                    shutil.rmtree(os.path.join(adobe_plugins_storage, folder_name))

            if self.plugin_folder:
                shutil.copytree(
                    self.plugin_folder,
                    os.path.join(adobe_plugins_storage, plugin_folder_withVersion),
                )
            else:
                print("No plugin folder found to install.")
                return

            # به‌روزرسانی فایل PS.json
            ps_json_path = os.path.join(plugins_info_path, "PS.json")

            new_plugin_entry = {
                "hostMinVersion": "22.5.0",
                "name": "ComfyUI for adobe Photoshop",
                "path": f"$localPlugins\\External\\{plugin_folder_withVersion}",
                "pluginId": "3e6d64e0",
                "status": "enabled",
                "type": "uxp",
                "versionString": plugin_version,
            }

            if os.path.exists(ps_json_path):
                with open(ps_json_path, "r") as f:
                    data = json.load(f)
                data["plugins"] = [
                    plugin
                    for plugin in data["plugins"]
                    if plugin["pluginId"] != "3e6d64e0"
                ]
                data["plugins"].append(new_plugin_entry)
            else:
                data = {"plugins": [new_plugin_entry]}

            with open(ps_json_path, "w") as f:
                json.dump(data, f, indent=2)

            print(f"Method 1: installed in {adobe_plugins_storage}")
        except PermissionError as e:
            print(f"Permission Error: {e}")
            self.request_admin_privileges()
        except Exception as e:
            print(f"Got Error: {e}")


if __name__ == "__main__":
    method_two = MethodTwo()
    try:
        method_two.install_plugin()
    except PermissionError:
        method_two.request_admin_privileges()

    method_one = MethodOne()
    try:
        method_one.execute()
    except PermissionError:
        method_one.request_admin_privileges()

    print(" ")
    print("PLEASE RESTART YOUR PHOTOSHOP AND LAUNCH THE PLUGIN")
    print(" ")
    input("Press any key to exit...")
