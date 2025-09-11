// File: lib/nxf_widget_list/nxf_cupertino/nxf_cupertino_action_sheet.dart
import 'package:flutter/cupertino.dart';

class NxfCupertinoActionSheet extends StatelessWidget {
  final String title;
  final String message;
  final List<CupertinoActionSheetAction> actions;
  final VoidCallback onCancel;

  const NxfCupertinoActionSheet({
    super.key,
    required this.title,
    required this.message,
    required this.actions,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoActionSheet(
      title: Text(title),
      message: Text(message),
      actions: actions,
      cancelButton: CupertinoActionSheetAction(
        onPressed: onCancel,
        child: const Text('Cancel'),
      ),
    );
  }
}
