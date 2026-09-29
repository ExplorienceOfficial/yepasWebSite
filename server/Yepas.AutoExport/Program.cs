using System;
using System.IO;
using System.Web.Configuration;
using Yepas.Api.Data;
using Yepas.Api.Domain;

namespace Yepas.AutoExport
{
    internal static class Program
    {
        private static int Main(string[] args)
        {
            try
            {
                if (args.Length != 2 || args[0] != "--site-path")
                    throw new ArgumentException("Kullanım: Yepas.AutoExport.exe --site-path <etkin site klasörü>");
                var sitePath = Path.GetFullPath(args[1]);
                if (!File.Exists(Path.Combine(sitePath, "Web.config")))
                    throw new InvalidOperationException("Site Web.config bulunamadı.");
                var mapping = new WebConfigurationFileMap();
                mapping.VirtualDirectories.Add("/", new VirtualDirectoryMapping(sitePath, true));
                var configuration = WebConfigurationManager.OpenMappedWebConfiguration(mapping, "/");
                var app = configuration.ConnectionStrings.ConnectionStrings["YepasApp"];
                var catalog = configuration.ConnectionStrings.ConnectionStrings["YepasCatalog"];
                if (app == null || catalog == null)
                    throw new InvalidOperationException("Bağlantı yapılandırması eksik.");
                DatabaseConnections.ConfigureForProcess(app.ConnectionString, catalog.ConnectionString);
                var result = new OrderFinalizationService().FinalizeDaily();
                Console.WriteLine("Günlük aktarım tamamlandı: {0:yyyy-MM-dd}; durum={1}",
                    result.DeliveryDate, result.State);
                return result.State == "FINALIZED" ? 0 : 1;
            }
            catch (Exception exception)
            {
                Console.Error.WriteLine("Günlük aktarım başarısız: " + exception.Message);
                return 1;
            }
        }
    }
}
