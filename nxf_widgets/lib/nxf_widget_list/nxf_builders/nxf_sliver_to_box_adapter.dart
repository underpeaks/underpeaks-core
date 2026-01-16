import 'package:flutter/material.dart';

class NxfSliverToBoxAdapter extends StatelessWidget {
  final Widget child;

  const NxfSliverToBoxAdapter({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(child: child);
  }
}
