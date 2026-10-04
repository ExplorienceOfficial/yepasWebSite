using System;
namespace Yepas.Api.Domain
{
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
    }
    public sealed class AccountConflictException : InvalidOperationException
    {
        public string Code { get; private set; }
        public AccountConflictException(string code, string message) : base(message) { Code = code; }
    }
}
