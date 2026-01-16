import 'package:flutter/material.dart';

class NxfSimpleDialog extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const NxfSimpleDialog({
    super.key,
    required this.title,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return SimpleDialog(
      title: Text(title),
      children: children,
    );
  }
}
