import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/models.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import 'main_shell.dart';

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

  void _goHome() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const MainShell()),
    );
  }

  bool _guardSystemOpen(AppState app) {
    if (!app.orderSystemOpen) {
      setState(() => _error = 'Sipariş sistemi şu anda kapalı. Lütfen daha sonra tekrar deneyin.');
      return false;
    }
    return true;
  }

  void _quickLogin(AppState app, Customer branch) {
    if (!_guardSystemOpen(app)) return;
    app.quickLogin(branch);
    _goHome();
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
    if (!_guardSystemOpen(app)) return;

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
    _goHome();
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final multiBranch = _branches != null;
    final systemOpen = app.orderSystemOpen;
    final accounts = app.rememberedTaxNumbers;

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
                  const Text('Bayi Sipariş',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.6)),
                  const SizedBox(height: 6),
                  const Text('Yepas fırın siparişlerinizi buradan geçin.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 15, color: YpColors.ink2)),
                  const SizedBox(height: 24),

                  if (!systemOpen) ...[
                    _ClosedBanner(),
                    const SizedBox(height: 20),
                  ],

                  // --- Kayıtlı hesaplar ---
                  if (accounts.isNotEmpty) ...[
                    _sectionLabel('Kayıtlı Girişler'),
                    const SizedBox(height: 8),
                    for (final tax in accounts)
                      _AccountCard(
                        taxNumber: tax,
                        branches: app.branchesForTax(tax),
                        enabled: systemOpen,
                        onTapBranch: (b) => _quickLogin(app, b),
                        onForget: () => app.forgetAccount(tax),
                      ),
                    const SizedBox(height: 12),
                    Row(children: [
                      const Expanded(child: Divider()),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        child: Text('veya yeni giriş',
                            style: TextStyle(fontSize: 12.5, color: YpColors.ink3)),
                      ),
                      const Expanded(child: Divider()),
                    ]),
                    const SizedBox(height: 16),
                  ],

                  // --- Vergi Numarası ---
                  _sectionLabel('Vergi Numarası'),
                  const SizedBox(height: 8),
                  TextField(
                    key: const Key('tax'),
                    controller: _taxController,
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

                  if (multiBranch) ...[
                    const SizedBox(height: 16),
                    _sectionLabel('Şube'),
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

                  const SizedBox(height: 16),
                  _sectionLabel('Şifre'),
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
                    Row(children: [
                      const Icon(Icons.error_outline_rounded, size: 17, color: YpColors.bad),
                      const SizedBox(width: 6),
                      Expanded(child: Text(_error!, style: const TextStyle(color: YpColors.bad, fontSize: 13.5))),
                    ]),
                  ],

                  const SizedBox(height: 22),
                  FilledButton(
                    onPressed: systemOpen ? _submit : null,
                    child: const Text('Giriş yap'),
                  ),
                  const SizedBox(height: 24),

                  _DemoSystemSwitch(
                    open: systemOpen,
                    onChanged: (v) => app.setSystemOpen(v),
                  ),
                  const SizedBox(height: 12),
                  _demoHint(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) => Text(text,
      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: YpColors.ink2));

  Widget _demoHint() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: YpColors.accentSoft, borderRadius: BorderRadius.circular(14)),
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
                  TextSpan(text: 'Demo giriş\n', style: TextStyle(fontWeight: FontWeight.w700, color: YpColors.ink)),
                  TextSpan(text: '• Çok şubeli: '),
                  TextSpan(text: '1234567890', style: TextStyle(fontWeight: FontWeight.w700, color: YpColors.ink)),
                  TextSpan(text: ' · Şifre 1234\n• Tek şube: '),
                  TextSpan(text: '1111111111', style: TextStyle(fontWeight: FontWeight.w700, color: YpColors.ink)),
                  TextSpan(text: ' · Şifre 1234'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

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

// ------------------------------------------------------------- kayıtlı hesap kartı

class _AccountCard extends StatelessWidget {
  final String taxNumber;
  final List<Customer> branches;
  final bool enabled;
  final ValueChanged<Customer> onTapBranch;
  final VoidCallback onForget;

  const _AccountCard({
    required this.taxNumber,
    required this.branches,
    required this.enabled,
    required this.onTapBranch,
    required this.onForget,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: YpColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: YpColors.hairline),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 6, 4),
            child: Row(
              children: [
                const Icon(Icons.receipt_long_rounded, size: 15, color: YpColors.ink3),
                const SizedBox(width: 6),
                Expanded(
                  child: Text('Vergi No $taxNumber',
                      style: const TextStyle(fontSize: 12.5, color: YpColors.ink2, fontWeight: FontWeight.w600)),
                ),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  tooltip: 'Hesabı kaldır',
                  icon: const Icon(Icons.close_rounded, size: 18, color: YpColors.ink3),
                  onPressed: onForget,
                ),
              ],
            ),
          ),
          for (var i = 0; i < branches.length; i++) ...[
            if (i > 0) const Divider(height: 1, indent: 14, endIndent: 14),
            _branchRow(branches[i]),
          ],
          const SizedBox(height: 6),
        ],
      ),
    );
  }

  Widget _branchRow(Customer b) {
    return Opacity(
      opacity: enabled ? 1 : 0.5,
      child: InkWell(
        onTap: enabled ? () => onTapBranch(b) : null,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: YpColors.accentSoft, borderRadius: BorderRadius.circular(11)),
                child: Text('${b.branchNo}',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: YpColors.accent)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(b.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600)),
                    Text('${b.branchNo}. Şube · ${b.district}',
                        style: const TextStyle(fontSize: 12.5, color: YpColors.ink2)),
                  ],
                ),
              ),
              const Icon(Icons.login_rounded, size: 19, color: YpColors.accent),
            ],
          ),
        ),
      ),
    );
  }
}

// ------------------------------------------------------------- sistem kapalı afişi

class _ClosedBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: YpColors.badSoft, borderRadius: BorderRadius.circular(14)),
      child: const Row(
        children: [
          Icon(Icons.lock_clock_rounded, color: YpColors.bad, size: 20),
          SizedBox(width: 10),
          Expanded(
            child: Text('Sipariş sistemi kapalı. Şu anda giriş yapılamıyor.',
                style: TextStyle(fontSize: 13.5, color: YpColors.ink, height: 1.35)),
          ),
        ],
      ),
    );
  }
}

// ------------------------------------------------------------- demo sistem anahtarı

class _DemoSystemSwitch extends StatelessWidget {
  final bool open;
  final ValueChanged<bool> onChanged;
  const _DemoSystemSwitch({required this.open, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 6, 10, 6),
      decoration: BoxDecoration(
        color: YpColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: YpColors.hairline),
      ),
      child: Row(
        children: [
          Icon(open ? Icons.toggle_on_rounded : Icons.toggle_off_rounded,
              size: 22, color: open ? YpColors.ok : YpColors.ink3),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Sipariş sistemi (demo)',
                    style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                Text(open ? 'Açık — giriş yapılabilir' : 'Kapalı — giriş engellendi',
                    style: const TextStyle(fontSize: 12, color: YpColors.ink3)),
              ],
            ),
          ),
          Switch(value: open, onChanged: onChanged, activeTrackColor: YpColors.ok),
        ],
      ),
    );
  }
}
