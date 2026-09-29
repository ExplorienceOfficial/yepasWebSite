using System;
using System.Globalization;

namespace Yepas.Api.Domain
{
    public static class DriverAccountPolicy
    {
        /// <summary>
        /// Şoförün değiştirilemeyen kullanıcı adı. Eski sistemdeki şoför kodu
        /// kullanılır; kod boş veya tek karakterse şoför kimliğinden üretilir,
        /// böylece kodu eksik şoförler için de giriş hesabı açılabilir.
        /// </summary>
        public static string LoginNameFor(int personnelId, string personnelCode)
        {
            var code = personnelCode == null ? null : personnelCode.Trim();
            return String.IsNullOrEmpty(code) || code.Length < 2
                ? "SFR-" + personnelId.ToString(CultureInfo.InvariantCulture)
                : code;
        }
    }
}
