using System;
using System.Configuration;

namespace Yepas.Api
{
    internal static class RuntimeSettings
    {
        public static bool DevelopmentMode
        {
            get
            {
                return String.Equals(ConfigurationManager.AppSettings["YepasDevelopmentMode"],
                    "true", StringComparison.OrdinalIgnoreCase);
            }
        }
    }
}
