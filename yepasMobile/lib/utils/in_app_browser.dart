import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../screens/web_page_screen.dart';

class AppBrowser {
  /// Varsayılan YEPAŞ Web adresi (Ekmek siparişleri portalı)
  static const String defaultUrl = 'https://yepaswebsitev1.vercel.app/';

  /// Web sayfasını uygulama içi tarayıcıda veya dahili WebView ekranında açar.
  /// Chrome uygulamasına ATMAZ, uygulamadan çıkmamış gibi açar.
  static Future<void> open(
    BuildContext context, {
    String? url,
    String? title,
    bool preferInAppWebViewScreen = true,
  }) async {
    final targetUrl = (url == null || url.trim().isEmpty) ? defaultUrl : url.trim();
    final uri = Uri.parse(targetUrl);

    if (preferInAppWebViewScreen) {
      // Tam entegre Flutter WebView Ekranı olarak aç
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => WebPageScreen(
            url: targetUrl,
            title: title ?? 'YEPAŞ Web Portalı',
          ),
        ),
      );
      return;
    }

    // Chrome Custom Tabs / SFSafariViewController ile uygulama içi overlay olarak aç
    try {
      final launched = await launchUrl(
        uri,
        mode: LaunchMode.inAppBrowserView,
        browserConfiguration: const BrowserConfiguration(
          showTitle: true,
        ),
      );

      if (!launched && context.mounted) {
        // Fallback olarak WebView ekranını aç
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => WebPageScreen(
              url: targetUrl,
              title: title ?? 'YEPAŞ Web Portalı',
            ),
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        // Fallback
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => WebPageScreen(
              url: targetUrl,
              title: title ?? 'YEPAŞ Web Portalı',
            ),
          ),
        );
      }
    }
  }
}
