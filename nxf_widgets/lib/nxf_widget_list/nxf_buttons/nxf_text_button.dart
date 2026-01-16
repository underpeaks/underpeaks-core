import 'package:flutter/material.dart';

class NxfTextButton extends StatelessWidget {
  final VoidCallback onPressed;
  final Widget child;

  const NxfTextButton({
    super.key,
    required this.onPressed,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onPressed,
      child: child,
    );
  }
}
