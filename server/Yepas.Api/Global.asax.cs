using System;
using System.Web;
using System.Web.Http;
using Newtonsoft.Json.Serialization;

namespace Yepas.Api
{
    public class WebApplication : HttpApplication
    {
        protected void Application_Start(object sender, EventArgs e)
        {
            GlobalConfiguration.Configure(config =>
            {
                config.MapHttpAttributeRoutes();
                config.MessageHandlers.Add(new LocalCorsHandler());
                config.Formatters.JsonFormatter.SerializerSettings.ContractResolver =
                    new CamelCasePropertyNamesContractResolver();
            });
        }
    }
}
