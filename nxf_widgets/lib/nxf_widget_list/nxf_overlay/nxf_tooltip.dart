import 'package:flutter/material.dart';

class NxfTooltip extends StatelessWidget {
  final String message;
  final Widget child;

  const NxfTooltip({
    super.key,
    required this.message,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: message,
      child: child,
    );
  }
}
