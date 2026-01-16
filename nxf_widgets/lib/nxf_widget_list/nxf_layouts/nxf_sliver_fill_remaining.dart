import 'package:flutter/material.dart';

class NxfSliverFillRemaining extends StatelessWidget {
  final Widget child;
  final bool hasScrollBody;

  const NxfSliverFillRemaining({
    super.key,
    required this.child,
    this.hasScrollBody = true,
  });

  @override
  Widget build(BuildContext context) {
    return SliverFillRemaining(
      hasScrollBody: hasScrollBody,
      child: child,
    );
  }
}
