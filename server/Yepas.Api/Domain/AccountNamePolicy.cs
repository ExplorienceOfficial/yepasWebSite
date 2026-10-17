using System;
namespace Yepas.Api.Domain
{
    public static class CustomerAccountPolicy
    {
        public static bool IsValidPassword(string value)
        {
            if (value == null || value.Length != 4) return false;
            foreach (var digit in value) if (digit < '0' || digit > '9') return false;
            return true;
        }
    }

    public static class AccountNamePolicy
    {
        public static bool HasWhitespace(string value)
        {
            if (value == null) return false;
            foreach (var character in value)
                if (Char.IsWhiteSpace(character)) return true;
            return false;
        }
        public static string Validate(string value)
        {
            if (HasWhitespace(value)) throw new ArgumentException("Kullanıcı adı boşluk içeremez.");
            if (String.IsNullOrEmpty(value) || value.Length < 3 || value.Length > 100)
                throw new ArgumentException("Kullanıcı adı 3-100 karakter olmalıdır.");
            return value;
        }

        public static string ValidateCustomer(string value)
        {
            value = Validate(value);
            var parts = value.Split('/');
            if (parts.Length > 2 || (parts[0].Length != 10 && parts[0].Length != 11))
                throw new ArgumentException("Kullanıcı adı 10 haneli vergi no veya 11 haneli TCKN; isteğe bağlı /şubeadı olmalıdır.");
            foreach (var c in parts[0])
                if (c < '0' || c > '9') throw new ArgumentException("Vergi no/TCKN yalnız rakam içermelidir.");
            if (parts.Length == 2)
            {
                if (parts[1].Length == 0) throw new ArgumentException("Şube adı boş olamaz.");
                foreach (var c in parts[1])
                    if (!Char.IsLetterOrDigit(c) && c != '-' && c != '_' && c != '.')
                        throw new ArgumentException("Şube adında harf, rakam, tire, alt çizgi veya nokta kullanılabilir.");
            }
            return value;
        }
    }
    public sealed class AccountConflictException : InvalidOperationException
    {
        public string Code { get; private set; }
        public AccountConflictException(string code, string message) : base(message) { Code = code; }
    }
}
