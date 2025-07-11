// File: lib/nxf_widget_list/nxf_cupertino/nxf_cupertino_alert_dialog.dart
import 'package:flutter/cupertino.dart';

Future<void> showNxfCupertinoAlertDialog({
  required BuildContext context,
  required String title,
  required String content,
  required String confirmText,
  VoidCallback? onConfirm,
  String cancelText = 'Cancel',
  VoidCallback? onCancel,
}) async {
  return showCupertinoDialog(
    context: context,
    builder: (_) => CupertinoAlertDialog(
      title: Text(title),
      content: Text(content),
      actions: [
        CupertinoDialogAction(
          child: Text(cancelText),
          onPressed: onCancel ?? () => Navigator.of(context).pop(),
        ),
        CupertinoDialogAction(
          child: Text(confirmText),
          onPressed: onConfirm ?? () => Navigator.of(context).pop(),
        ),
      ],
    ),
  );
}
