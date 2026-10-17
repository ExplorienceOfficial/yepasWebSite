using System;
using System.Threading;
using System.Web.Hosting;
using Yepas.Api.Data;

namespace Yepas.Api
{
    // IIS-owned retry lifecycle, not browser polling. A stopped/idle app cannot
    // deliver; its committed business state remains available for reconciliation.
    internal sealed class RealtimeDeliveryWorker : IRegisteredObject
    {
        private Timer timer;
        private RealtimeDeliveryWorker() { }
        public static void Start()
        {
            var worker = new RealtimeDeliveryWorker();
            HostingEnvironment.RegisterObject(worker);
            worker.timer = new Timer(_ => RealtimePublisher.NotifyCommitted(), null, 1000, 10000);
        }
        public void Stop(bool immediate)
        {
            var current = Interlocked.Exchange(ref timer, null);
            if (current != null) current.Dispose();
            HostingEnvironment.UnregisterObject(this);
        }
    }
}
