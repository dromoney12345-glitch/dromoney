import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:play_install_referrer/play_install_referrer.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Bridges Play Install Referrer + App Links → WebView invite autofill.
///
/// Web (Register.jsx) calls:
///   window.flutter_inappwebview.callHandler('getInstallReferrer')
/// and also accepts:
///   window.savePendingReferral(referrerString)
class ReferralInstallBridge {
  ReferralInstallBridge._();
  static final ReferralInstallBridge instance = ReferralInstallBridge._();

  static const _prefsKey = 'dromoney_install_referrer';
  static const _codeKey = 'dromoney_referral_code';

  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _linkSub;

  String _rawReferrer = '';
  String _inviteCode = '';

  String get rawReferrer => _rawReferrer;
  String get inviteCode => _inviteCode;

  /// Call once from main() / first screen before WebView loads.
  Future<void> init() async {
    await _loadCached();
    await _capturePlayInstallReferrer();
    await _captureInitialAppLink();
    _linkSub?.cancel();
    _linkSub = _appLinks.uriLinkStream.listen((uri) {
      _applyFromUri(uri);
    });
  }

  Future<void> dispose() async {
    await _linkSub?.cancel();
    _linkSub = null;
  }

  Future<void> _loadCached() async {
    final prefs = await SharedPreferences.getInstance();
    _rawReferrer = prefs.getString(_prefsKey) ?? '';
    _inviteCode = prefs.getString(_codeKey) ?? '';
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    if (_rawReferrer.isNotEmpty) {
      await prefs.setString(_prefsKey, _rawReferrer);
    }
    if (_inviteCode.isNotEmpty) {
      await prefs.setString(_codeKey, _inviteCode);
    }
  }

  /// Play Store install: reads `referrer=` from the share link.
  Future<void> _capturePlayInstallReferrer() async {
    try {
      final details = await PlayInstallReferrer.installReferrer;
      final referrer = (details.installReferrer ?? '').trim();
      if (referrer.isEmpty) return;
      _rawReferrer = referrer;
      final code = extractInviteCode(referrer);
      if (code.isNotEmpty) _inviteCode = code;
      await _persist();
    } catch (_) {
      // Emulator / non-Play installs have no referrer — ignore.
    }
  }

  Future<void> _captureInitialAppLink() async {
    try {
      final uri = await _appLinks.getInitialLink();
      if (uri != null) _applyFromUri(uri);
    } catch (_) {}
  }

  void _applyFromUri(Uri uri) {
    final code = extractInviteCode(uri.toString());
    if (code.isEmpty) return;
    _inviteCode = code;
    _rawReferrer = uri.toString();
    unawaited(_persist());
  }

  /// Register JS handlers the website already expects.
  void registerWebViewHandlers(InAppWebViewController controller) {
    controller.addJavaScriptHandler(
      handlerName: 'getInstallReferrer',
      callback: (args) => _rawReferrer.isNotEmpty ? _rawReferrer : _inviteCode,
    );
    controller.addJavaScriptHandler(
      handlerName: 'getPlayInstallReferrer',
      callback: (args) => _rawReferrer.isNotEmpty ? _rawReferrer : _inviteCode,
    );
    controller.addJavaScriptHandler(
      handlerName: 'getReferrer',
      callback: (args) => _rawReferrer.isNotEmpty ? _rawReferrer : _inviteCode,
    );
    controller.addJavaScriptHandler(
      handlerName: 'getReferralCode',
      callback: (args) => _inviteCode,
    );
    controller.addJavaScriptHandler(
      handlerName: 'getInviteCode',
      callback: (args) => _inviteCode,
    );
    controller.addJavaScriptHandler(
      handlerName: 'installReferrer',
      callback: (args) => _rawReferrer.isNotEmpty ? _rawReferrer : _inviteCode,
    );
  }

  /// Push invite into the page as soon as it loads (Sign Up autofill).
  Future<void> injectIntoWebView(InAppWebViewController controller) async {
    final payload = _rawReferrer.isNotEmpty
        ? _rawReferrer
        : (_inviteCode.isNotEmpty ? 'ref=$_inviteCode' : '');
    if (payload.isEmpty) return;

    final escaped = payload
        .replaceAll('\\', '\\\\')
        .replaceAll("'", "\\'")
        .replaceAll('\n', ' ')
        .replaceAll('\r', '');

    await controller.evaluateJavascript(source: """
      (function () {
        var raw = '$escaped';
        try {
          if (typeof window.savePendingReferral === 'function') window.savePendingReferral(raw);
          if (typeof window.savePendingReferralCode === 'function') window.savePendingReferralCode(raw);
          if (typeof window.onInstallReferrer === 'function') window.onInstallReferrer(raw);
          window.__installReferrer = raw;
          window.installReferrer = raw;
        } catch (e) {}
      })();
    """);
  }

  /// Extract invite code from Play referrer payload or /join/CODE URL.
  static String extractInviteCode(String raw) {
    final text = raw.trim();
    if (text.isEmpty) return '';

    try {
      final decoded = Uri.decodeComponent(Uri.decodeComponent(text));
      final params = Uri.splitQueryString(
        decoded.contains('=') ? decoded.replaceFirst(RegExp(r'^referrer='), '') : 'ref=$decoded',
      );
      for (final key in ['ref', 'invite', 'referral', 'utm_content', 'code']) {
        final v = _normalizeCode(params[key] ?? '');
        if (v.isNotEmpty) return v;
      }
    } catch (_) {}

    final join = RegExp(r'/join/([A-Za-z0-9]{4,8})', caseSensitive: false).firstMatch(text);
    if (join != null) return _normalizeCode(join.group(1)!);

    final kv = RegExp(r'(?:^|[?&\s#])(?:ref|invite|referral|utm_content)=([A-Za-z0-9]+)', caseSensitive: false)
        .firstMatch(text);
    if (kv != null) return _normalizeCode(kv.group(1)!);

    return _normalizeCode(text);
  }

  static String _normalizeCode(String code) {
    final cleaned = code.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
    if (cleaned.length < 4 || cleaned.length > 8) return '';
    const reserved = {
      'REGISTER', 'LOGIN', 'AUTH', 'USER', 'ADMIN', 'JOIN', 'HOME', 'EARN',
      'WALLET', 'PROFILE', 'INCOME', 'INVITE', 'SHARE', 'ORGANIC', 'GOOGLE', 'PLAY',
    };
    if (reserved.contains(cleaned)) return '';
    return cleaned;
  }
}
