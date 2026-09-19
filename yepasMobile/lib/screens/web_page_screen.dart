import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../theme/app_theme.dart';

class WebPageScreen extends StatefulWidget {
  final String url;
  final String title;

  const WebPageScreen({
    super.key,
    required this.url,
    this.title = 'YEPAŞ Web Portalı',
  });

  @override
  State<WebPageScreen> createState() => _WebPageScreenState();
}

class _WebPageScreenState extends State<WebPageScreen> {
  late final WebViewController _controller;
  int _loadingProgress = 0;
  bool _isLoading = true;
  String? _currentTitle;

  @override
  void initState() {
    super.initState();
    _currentTitle = widget.title;

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            if (mounted) {
              setState(() {
                _loadingProgress = progress;
                _isLoading = progress < 100;
              });
            }
          },
          onPageStarted: (String url) {
            if (mounted) {
              setState(() {
                _isLoading = true;
              });
            }
          },
          onPageFinished: (String url) {
            if (mounted) {
              setState(() {
                _isLoading = false;
              });
            }
          },
          onWebResourceError: (WebResourceError error) {
            debugPrint('WebView hatası: ${error.description}');
          },
          onNavigationRequest: (NavigationRequest request) {
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.url));
  }

  Future<bool> _onWillPop() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return false; // Sayfada geriye git, ekrandan çıkma
    }
    return true; // Ekrandan çık
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (bool didPop, dynamic result) async {
        if (didPop) return;
        final shouldPop = await _onWillPop();
        if (shouldPop && context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.close_rounded),
            tooltip: 'Kapat',
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _currentTitle ?? widget.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              Text(
                widget.url,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11.5, color: YpColors.ink2),
              ),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded, size: 22),
              tooltip: 'Yenile',
              onPressed: () => _controller.reload(),
            ),
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert_rounded),
              onSelected: (value) async {
                if (value == 'browser') {
                  final uri = Uri.parse(widget.url);
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                } else if (value == 'home') {
                  _controller.loadRequest(Uri.parse(widget.url));
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'home',
                  child: Row(
                    children: [
                      Icon(Icons.home_outlined, size: 20, color: YpColors.ink),
                      SizedBox(width: 10),
                      Text('Ana Sayfaya Dön'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'browser',
                  child: Row(
                    children: [
                      Icon(Icons.open_in_browser_rounded, size: 20, color: YpColors.ink),
                      SizedBox(width: 10),
                      Text('Dış Tarayıcıda Aç'),
                    ],
                  ),
                ),
              ],
            ),
          ],
          bottom: _isLoading
              ? PreferredSize(
                  preferredSize: const Size.fromHeight(3),
                  child: LinearProgressIndicator(
                    value: _loadingProgress / 100.0,
                    backgroundColor: YpColors.surface2,
                    valueColor: const AlwaysStoppedAnimation<Color>(YpColors.accent),
                    minHeight: 3,
                  ),
                )
              : null,
        ),
        body: WebViewWidget(controller: _controller),
      ),
    );
  }
}
