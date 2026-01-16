// File: lib/nxf_widget_list/nxf_cupertino/nxf_cupertino_adaptive_toolbar.dart
import 'package:flutter/cupertino.dart';

class NxfCupertinoAdaptiveToolbar extends StatelessWidget {
  final Widget child;

  const NxfCupertinoAdaptiveToolbar({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoAdaptiveTextSelectionToolbar.buttonItems(
      anchors: const TextSelectionToolbarAnchors(primaryAnchor: Offset.zero),
      buttonItems: [
        ContextMenuButtonItem(
          label: 'Copy',
          onPressed: () {},
        ),
      ],
    );
  }
}
