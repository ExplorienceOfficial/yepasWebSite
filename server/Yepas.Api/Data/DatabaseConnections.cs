using System;
using System.Configuration;

namespace Yepas.Api.Data
{
    public static class DatabaseConnections
    {
        private static string applicationOverride;
        private static string catalogOverride;

        public static void ConfigureForProcess(string application, string catalog)
        {
            if (String.IsNullOrWhiteSpace(application) || String.IsNullOrWhiteSpace(catalog))
                throw new ArgumentException("Bağlantı dizeleri boş olamaz.");
            applicationOverride = application;
            catalogOverride = catalog;
        }

        public static string Application()
        {
            if (applicationOverride != null) return applicationOverride;
            return Read("YepasApp", "YEPAS_APP_CONNECTION",
                @"Data Source=.\YEPASDEV;Initial Catalog=EkmekSiparis;Integrated Security=SSPI;Connect Timeout=15;Encrypt=False",
                "Application database is not configured.");
        }

        public static string Catalog()
        {
            if (catalogOverride != null) return catalogOverride;
            return Read("YepasCatalog", "YEPAS_CATALOG_CONNECTION",
                @"Data Source=.\YEPASDEV;Initial Catalog=PrestoPlus_Local;Integrated Security=SSPI;Connect Timeout=15;Encrypt=False",
                "Legacy database is not configured.");
        }

        private static string Read(string configName, string environmentName,
            string debugDefault, string missingMessage)
        {
            var setting = ConfigurationManager.ConnectionStrings[configName];
            var value = setting == null ? null : setting.ConnectionString;
            if (String.IsNullOrWhiteSpace(value))
                value = Environment.GetEnvironmentVariable(environmentName);
            if (String.IsNullOrWhiteSpace(value) && RuntimeSettings.DevelopmentMode)
                value = debugDefault;
            if (String.IsNullOrWhiteSpace(value))
                throw new InvalidOperationException(missingMessage);
            return value;
        }
    }
}
