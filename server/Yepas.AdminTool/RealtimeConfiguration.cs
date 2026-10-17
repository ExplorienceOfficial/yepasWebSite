using System;
using System.Configuration;
using System.IO;
using System.Web.Configuration;

namespace Yepas.AdminTool
{
    public static class RealtimeConfiguration
    {
        public static void Save(string sitePath, string hubUrl, string publishUrl, string key)
        {
            if (String.IsNullOrWhiteSpace(sitePath)) throw new ArgumentException("Site path is required.");
            ValidateUrl(hubUrl, "/hubs/orders");
            ValidateUrl(publishUrl, "/internal/orders-changed");
            byte[] decoded;
            try { decoded = Convert.FromBase64String(key ?? ""); }
            catch (FormatException) { throw new ArgumentException("Shared key must be Base64."); }
            var length = decoded.Length;
            Array.Clear(decoded, 0, decoded.Length);
            if (length < 32) throw new ArgumentException("Shared key must contain at least 32 random bytes.");
            sitePath = Path.GetFullPath(sitePath);
            if (!File.Exists(Path.Combine(sitePath, "Web.config")))
                throw new ArgumentException("Web.config was not found in the site path.");

            var mapping = new WebConfigurationFileMap();
            mapping.VirtualDirectories.Add("/", new VirtualDirectoryMapping(sitePath, true));
            var config = WebConfigurationManager.OpenMappedWebConfiguration(mapping, "/");
            var settings = config.AppSettings;
            settings.Settings.Remove("YepasRealtimeHubUrl");
            settings.Settings.Remove("YepasRealtimePublishUrl");
            settings.Settings.Remove("YepasRealtimeKey");
            settings.Settings.Add("YepasRealtimeHubUrl", hubUrl);
            settings.Settings.Add("YepasRealtimePublishUrl", publishUrl);
            settings.Settings.Add("YepasRealtimeKey", key);
            // Protect before saving: never persist the new shared key in clear text.
            if (settings.SectionInformation.IsProtected) settings.SectionInformation.UnprotectSection();
            settings.SectionInformation.ProtectSection("DataProtectionConfigurationProvider");
            settings.SectionInformation.ForceSave = true;
            config.Save(ConfigurationSaveMode.Modified);
        }

        private static void ValidateUrl(string value, string path)
        {
            Uri uri;
            if (!Uri.TryCreate(value, UriKind.Absolute, out uri) || uri.Scheme != "https" ||
                uri.AbsolutePath != path || uri.Query.Length != 0 || uri.Fragment.Length != 0 ||
                uri.UserInfo.Length != 0)
                throw new ArgumentException("Invalid HTTPS endpoint for " + path + ".");
        }
    }
}
