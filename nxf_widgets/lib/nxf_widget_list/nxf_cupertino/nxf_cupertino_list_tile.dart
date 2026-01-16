import 'package:flutter/cupertino.dart';

class NxfCupertinoListTile extends StatelessWidget {
  final Widget title;
  final Widget? leading;
  final Widget? trailing;
  final VoidCallback? onTap;

  const NxfCupertinoListTile({
    super.key,
    required this.title,
    this.leading,
    this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoListTile(
      title: title,
      leading: leading,
      trailing: trailing,
      onTap: onTap,
    );
  }
}
