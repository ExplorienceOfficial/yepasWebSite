using System;
using System.Configuration;

namespace Yepas.Api.Data
{
    internal static class DatabaseConnections
    {
        public static string Application()
        {
            return Read("YepasApp", "YEPAS_APP_CONNECTION",
                @"Data Source=.\YEPASDEV;Initial Catalog=EkmekSiparis;Integrated Security=SSPI;Connect Timeout=15;Encrypt=False",
                "Application database is not configured.");
        }

        public static string Catalog()
        {
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
