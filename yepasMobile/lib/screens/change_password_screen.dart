import 'package:flutter/material.dart';

import '../api/api_exception.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';

/// Parola değiştirme (README §2).
/// [mandatory] true iken geçici parola akışıdır: geri dönülemez, kök widget
/// başarıda uygulamaya geçer. false iken profilden açılır ve pop ile döner.
class ChangePasswordScreen extends StatefulWidget {
  final bool mandatory;
  const ChangePasswordScreen({super.key, this.mandatory = false});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();

  bool _obscure = true;
  bool _loading = false;
  String? _error;

  static const int _minLen = 12;
  static const int _maxLen = 128;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  String? _validate() {
    final cur = _current.text;
    final neu = _next.text;
    final con = _confirm.text;
    if (cur.isEmpty) return 'Mevcut parolanızı girin.';
    if (neu.length < _minLen || neu.length > _maxLen) {
      return 'Yeni parola $_minLen-$_maxLen karakter olmalı.';
    }
    if (neu == cur) return 'Yeni parola mevcut paroladan farklı olmalı.';
    if (neu != con) return 'Yeni parolalar eşleşmiyor.';
    return null;
  }

  Future<void> _submit() async {
    final app = AppScope.of(context);
    final problem = _validate();
    if (problem != null) {
      setState(() => _error = problem);
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await app.changePassword(_current.text, _next.text);
      if (!mounted) return;
      if (widget.mandatory) {
        // Kök widget otomatik olarak uygulamaya geçer.
      } else {
        Navigator.of(context).pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Parolanız güncellendi.')),
        );
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.userMessage);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    return Scaffold(
      backgroundColor: YpColors.canvas,
      appBar: AppBar(
        automaticallyImplyLeading: !widget.mandatory,
        title: const Text('Parola değiştir'),
        actions: [
          if (widget.mandatory)
            TextButton(
              onPressed: _loading ? null : app.logout,
              child: const Text('Çıkış', style: TextStyle(color: YpColors.bad)),
            ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (widget.mandatory) ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                        color: YpColors.warnSoft,
                        borderRadius: BorderRadius.circular(14)),
                    child: const Row(children: [
                      Icon(Icons.lock_reset_rounded,
                          color: YpColors.warn, size: 20),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Devam etmeden önce geçici parolanızı değiştirmelisiniz.',
                          style: TextStyle(
                              fontSize: 13.5, color: YpColors.ink, height: 1.35),
                        ),
                      ),
                    ]),
                  ),
                  const SizedBox(height: 20),
                ],
                _label('Mevcut parola'),
                const SizedBox(height: 8),
                _field(_current, 'Mevcut parolanız'),
                const SizedBox(height: 16),
                _label('Yeni parola'),
                const SizedBox(height: 8),
                _field(_next, 'En az $_minLen karakter'),
                const SizedBox(height: 16),
                _label('Yeni parola (tekrar)'),
                const SizedBox(height: 8),
                _field(_confirm, 'Yeni parolayı tekrar girin',
                    onSubmit: (_) => _submit()),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Row(children: [
                    const Icon(Icons.error_outline_rounded,
                        size: 17, color: YpColors.bad),
                    const SizedBox(width: 6),
                    Expanded(
                        child: Text(_error!,
                            style: const TextStyle(
                                color: YpColors.bad, fontSize: 13.5))),
                  ]),
                ],
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                              strokeWidth: 2.4, color: Colors.white))
                      : const Text('Parolayı güncelle'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _label(String t) => Text(t,
      style: const TextStyle(
          fontSize: 13, fontWeight: FontWeight.w600, color: YpColors.ink2));

  Widget _field(TextEditingController c, String hint,
      {ValueChanged<String>? onSubmit}) {
    return TextField(
      controller: c,
      enabled: !_loading,
      obscureText: _obscure,
      textInputAction:
          onSubmit != null ? TextInputAction.go : TextInputAction.next,
      onSubmitted: onSubmit,
      onChanged: (_) {
        if (_error != null) setState(() => _error = null);
      },
      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: YpColors.ink3, fontWeight: FontWeight.w400),
        filled: true,
        fillColor: YpColors.surface,
        prefixIcon: const Icon(Icons.key_rounded, color: YpColors.ink3),
        suffixIcon: IconButton(
          icon: Icon(
              _obscure
                  ? Icons.visibility_outlined
                  : Icons.visibility_off_outlined,
              color: YpColors.ink3,
              size: 20),
          onPressed: () => setState(() => _obscure = !_obscure),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: YpColors.hairline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: YpColors.accent, width: 1.6),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: YpColors.hairline),
        ),
      ),
    );
  }
}
