// File: lib/nxf_widget_list/cupertino/nxf_cupertino_navigation_bar.dart
import 'package:flutter/cupertino.dart';

class NxfCupertinoNavigationBar extends StatelessWidget implements ObstructingPreferredSizeWidget {
  final Widget middle;
  final Widget? leading;
  final Widget? trailing;
  final Color? backgroundColor;

  const NxfCupertinoNavigationBar({
    super.key,
    required this.middle,
    this.leading,
    this.trailing,
    this.backgroundColor,
  });

  @override
  Size get preferredSize => const Size.fromHeight(44.0);

  @override
  bool shouldFullyObstruct(BuildContext context) => true;

  @override
  Widget build(BuildContext context) {
    return CupertinoNavigationBar(
      middle: middle,
      leading: leading,
      trailing: trailing,
      backgroundColor: backgroundColor,
    );
  }
}
