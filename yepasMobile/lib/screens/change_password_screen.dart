import 'package:flutter/material.dart';

import '../state/app_state.dart';
import '../theme/app_theme.dart';
import 'main_shell.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _repeat = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _repeat.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    if (_next.text.length < 12) {
      setState(() => _error = 'Yeni parola en az 12 karakter olmalıdır.');
      return;
    }
    if (_next.text != _repeat.text) {
      setState(() => _error = 'Yeni parolalar eşleşmiyor.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final error = await AppScope.of(context).changePassword(_current.text, _next.text);
    if (!mounted) return;
    setState(() => _busy = false);
    if (error != null) {
      setState(() => _error = error);
      return;
    }
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const MainShell()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Parolanızı değiştirin')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Text(
            'İlk girişte geçici parolanızı yalnızca sizin bildiğiniz bir parolayla değiştirin.',
            style: TextStyle(color: YpColors.ink2, height: 1.5),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _current,
            obscureText: true,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Geçici parola'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _next,
            obscureText: true,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Yeni parola',
              helperText: 'En az 12 karakter; yalnızca rakam kullanabilirsiniz.',
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _repeat,
            obscureText: true,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Yeni parola tekrar'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: YpColors.bad)),
          ],
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Parolayı değiştir ve devam et'),
          ),
        ],
      ),
    );
  }
}
