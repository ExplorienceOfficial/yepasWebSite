using System;
using System.Globalization;

namespace Yepas.Api.Domain
{
    public static class DriverAccountPolicy
    {
        public static bool IsValidPassword(string value)
        {
            return IsNumericPin(value, 2);
        }

        private static bool IsNumericPin(string value, int length)
        {
            if (value == null || value.Length != length) return false;
            foreach (var digit in value) if (digit < '0' || digit > '9') return false;
            return true;
        }

        /// <summary>
        /// Şoförün değiştirilemeyen kullanıcı adı. Eski sistemdeki şoför kodu
        /// kullanılır; kod boş veya tek karakterse şoför kimliğinden üretilir,
        /// böylece kodu eksik şoförler için de giriş hesabı açılabilir.
        /// </summary>
        public static string LoginNameFor(int personnelId, string personnelCode)
        {
            var code = personnelCode == null ? null : personnelCode.Trim();
            return String.IsNullOrEmpty(code) || code.Length < 2 || AccountNamePolicy.HasWhitespace(code)
                ? "SFR-" + personnelId.ToString(CultureInfo.InvariantCulture)
                : code;
        }
    }
}
