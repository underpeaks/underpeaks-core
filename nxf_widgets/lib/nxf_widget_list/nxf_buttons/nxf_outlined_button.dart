import 'package:flutter/material.dart';

class NxfOutlinedButton extends StatelessWidget {
  final VoidCallback onPressed;
  final Widget child;
  final Color? borderColor;

  const NxfOutlinedButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        side: BorderSide(color: borderColor ?? Colors.blue),
      ),
      child: child,
    );
  }
}
