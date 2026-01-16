
import 'package:flutter/material.dart';

class NxfMergeSemantics extends StatelessWidget {
  final Widget child;

  const NxfMergeSemantics({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return MergeSemantics(child: child);
  }
}
