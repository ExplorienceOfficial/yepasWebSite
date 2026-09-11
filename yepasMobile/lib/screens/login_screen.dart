import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/models.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _taxController = TextEditingController();
  final _passController = TextEditingController();

  /// Vergi numarasına bağlı birden çok şube varsa dolar (null → şube alanı gizli).
  List<Customer>? _branches;
  String? _selectedBranchId;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _taxController.dispose();
    _passController.dispose();
    super.dispose();
  }

  void _onTaxChanged(String value) {
    final app = AppScope.of(context);
    final branches = app.branchesForTax(value);
    setState(() {
      _error = null;
      if (branches.length > 1) {
        _branches = branches;
        if (!branches.any((b) => b.id == _selectedBranchId)) {
          _selectedBranchId = null;
        }
      } else {
        _branches = null;
        _selectedBranchId = null;
      }
    });
  }

  void _submit() {
    final app = AppScope.of(context);
    final tax = _taxController.text.trim();
    final pass = _passController.text;

    if (tax.isEmpty) {
      setState(() => _error = 'Lütfen vergi numaranızı girin.');
      return;
    }
    final branches = app.branchesForTax(tax);
    if (branches.isEmpty) {
      setState(() => _error = 'Bu vergi numarasına ait bayi bulunamadı.');
      return;
    }

    late final Customer target;
    if (branches.length == 1) {
      target = branches.first;
    } else {
      if (_selectedBranchId == null) {
        setState(() {
          _branches = branches;
          _error = 'Birden fazla şubeniz var, lütfen şube seçin.';
        });
        return;
      }
      target = branches.firstWhere((b) => b.id == _selectedBranchId);
    }

    if (pass.isEmpty) {
      setState(() => _error = 'Lütfen şifrenizi girin.');
      return;
    }
    if (!app.loginWith(target, pass)) {
      setState(() => _error = 'Şifre hatalı.');
      return;
    }

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const HomeScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final multiBranch = _branches != null;

    return Scaffold(
      backgroundColor: YpColors.canvas,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 12),
                  Center(
                    child: Container(
                      width: 88,
                      height: 88,
                      decoration: BoxDecoration(
                        color: YpColors.surface,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: YpColors.hairline),
                        boxShadow: const [
                          BoxShadow(color: Color(0x0F000000), blurRadius: 18, offset: Offset(0, 6)),
                        ],
                      ),
                      clipBehavior: Clip.antiAlias,
                      padding: const EdgeInsets.all(12),
                      child: Image.asset('assets/logo.png', fit: BoxFit.contain),
                    ),
                  ),
                  const SizedBox(height: 22),
                  const Text(
                    'Bayi Sipariş',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.6),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Yepas fırın siparişlerinizi buradan geçin.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 15, color: YpColors.ink2),
                  ),
                  const SizedBox(height: 32),

                  // --- Vergi Numarası ---
                  _label('Vergi Numarası'),
                  const SizedBox(height: 8),
                  TextField(
                    key: const Key('tax'),
                    controller: _taxController,
                    autofocus: true,
                    keyboardType: TextInputType.number,
                    textInputAction: TextInputAction.next,
                    onChanged: _onTaxChanged,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(11),
                    ],
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, letterSpacing: 1),
                    decoration: _decoration(hint: 'örn. 1234567890', icon: Icons.receipt_long_rounded),
                  ),

                  // --- Şube (yalnızca birden fazla şube varsa) ---
                  if (multiBranch) ...[
                    const SizedBox(height: 16),
                    _label('Şube'),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      key: const Key('branch'),
                      value: _selectedBranchId,
                      isExpanded: true,
                      hint: const Text('Şube seçin…'),
                      icon: const Icon(Icons.expand_more_rounded, color: YpColors.ink3),
                      decoration: _decoration(icon: Icons.store_mall_directory_rounded),
                      items: [
                        for (final b in _branches!)
                          DropdownMenuItem(
                            value: b.id,
                            child: Text('${b.branchNo}. Şube · ${b.name}',
                                maxLines: 1, overflow: TextOverflow.ellipsis),
                          ),
                      ],
                      onChanged: (v) => setState(() {
                        _selectedBranchId = v;
                        _error = null;
                      }),
                    ),
                  ],

                  // --- Şifre ---
                  const SizedBox(height: 16),
                  _label('Şifre'),
                  const SizedBox(height: 8),
                  TextField(
                    key: const Key('pass'),
                    controller: _passController,
                    obscureText: _obscure,
                    textInputAction: TextInputAction.go,
                    onSubmitted: (_) => _submit(),
                    onChanged: (_) {
                      if (_error != null) setState(() => _error = null);
                    },
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                    decoration: _decoration(hint: '••••', icon: Icons.lock_outline_rounded).copyWith(
                      suffixIcon: IconButton(
                        icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                            color: YpColors.ink3, size: 20),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      ),
                    ),
                  ),

                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const Icon(Icons.error_outline_rounded, size: 17, color: YpColors.bad),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(_error!, style: const TextStyle(color: YpColors.bad, fontSize: 13.5)),
                        ),
                      ],
                    ),
                  ],

                  const SizedBox(height: 22),
                  FilledButton(onPressed: _submit, child: const Text('Giriş yap')),
                  const SizedBox(height: 28),

                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: YpColors.accentSoft,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.info_outline_rounded, size: 18, color: YpColors.accent),
                        const SizedBox(width: 10),
                        Expanded(
                          child: RichText(
                            text: const TextSpan(
                              style: TextStyle(fontSize: 13, color: YpColors.ink2, height: 1.5),
                              children: [
                                TextSpan(
                                    text: 'Demo giriş\n',
                                    style: TextStyle(fontWeight: FontWeight.w700, color: YpColors.ink)),
                                TextSpan(text: '• Çok şubeli: '),
                                TextSpan(
                                    text: '1234567890',
                                    style: TextStyle(fontWeight: FontWeight.w700, color: YpColors.ink)),
                                TextSpan(text: ' · Şifre 1234\n• Tek şube: '),
                                TextSpan(
                                    text: '1111111111',
                                    style: TextStyle(fontWeight: FontWeight.w700, color: YpColors.ink)),
                                TextSpan(text: ' · Şifre 1234'),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Text(text,
      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: YpColors.ink2));

  InputDecoration _decoration({String? hint, required IconData icon}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: YpColors.ink3, letterSpacing: 0, fontWeight: FontWeight.w400),
      filled: true,
      fillColor: YpColors.surface,
      prefixIcon: Icon(icon, color: YpColors.ink3),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: YpColors.hairline),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: YpColors.accent, width: 1.6),
      ),
    );
  }
}
