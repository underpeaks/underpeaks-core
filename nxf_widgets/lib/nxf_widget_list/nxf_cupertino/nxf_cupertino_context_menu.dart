import 'package:flutter/cupertino.dart';

class NxfCupertinoContextMenu extends StatelessWidget {
  final Widget child;
  final List<Widget> actions;

  const NxfCupertinoContextMenu({
    super.key,
    required this.child,
    required this.actions,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoContextMenu(
      actions: actions,
      child: child,
    );
  }
}
