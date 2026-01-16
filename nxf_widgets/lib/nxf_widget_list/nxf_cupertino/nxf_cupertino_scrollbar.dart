// File: lib/nxf_widget_list/cupertino/nxf_cupertino_scrollbar.dart
import 'package:flutter/cupertino.dart';

class NxfCupertinoScrollbar extends StatelessWidget {
  final Widget child;
  final bool thumbVisibility;
  final ScrollController? controller;

  const NxfCupertinoScrollbar({
    super.key,
    required this.child,
    this.thumbVisibility = false,
    this.controller,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoScrollbar(
      thumbVisibility: thumbVisibility,
      controller: controller,
      child: child,
    );
  }
}
