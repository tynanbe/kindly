/// A JavaScript `Set` type.
///
/// Unlike `gleam/set`, a JavaScript `Set` is mutable, and order is preserved;
/// however, no functions in this module mutate the given `Set`.
///
/// TODO: Note JS `Set` behaviour for comparisons (SameValueZero, objects are compared by reference, not by value) - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
///
pub type Set(a)

/// TODO: rm
///
/// Returns `True` if the given function returns `True` for any member in the
/// given `Set`.
///
/// If the function returns `True` for any member, the rest of the `Set` isn't
/// checked.
///
@external(javascript, "../set_ffi.ts", "any")
pub fn any(in xs: Set(a), satisfying f: fn(a) -> Bool) -> Bool

/// Determines whether a `Set` contains the given member.
///
@external(javascript, "../set_ffi.ts", "contains")
pub fn contains(in xs: Set(a), this x: a) -> Bool

/// Removes a member from the given `Set`.
///
/// If the member isn't present, the `Set` is unchanged.
///
@external(javascript, "../set_ffi.ts", "delete_member")
pub fn delete(from xs: Set(a), this x: a) -> Set(a)

/// Creates a new `Set` containing any members from the first given `Set` that
/// aren't present in the second.
///
@external(javascript, "../set_ffi.ts", "difference")
pub fn difference(from xs: Set(a), minus ys: Set(a)) -> Set(a)

/// Creates a new `Set` with members from the given `List`, preserving order.
///
@external(javascript, "../set_ffi.ts", "new_set")
pub fn from_list(xs: List(a)) -> Set(a)

/// Inserts a member into the given `Set`.
///
/// If the member is already present, the `Set` is unchanged.
///
@external(javascript, "../set_ffi.ts", "insert")
pub fn insert(into xs: Set(a), this x: a) -> Set(a)

/// Creates a new `Set` containing any members present in both given sets.
///
@external(javascript, "../set_ffi.ts", "intersection")
pub fn intersection(of xs: Set(a), and ys: Set(a)) -> Set(a)

/// Determines whether the given sets have no common members.
///
@external(javascript, "../set_ffi.ts", "is_disjoint")
pub fn is_disjoint(xs: Set(a), from ys: Set(a)) -> Bool

/// Determines whether the given `Set` is empty.
///
pub fn is_empty(xs: Set(a)) -> Bool {
  xs == new()
}

/// Determines whether a `Set` is fully contained by another.
///
@external(javascript, "../set_ffi.ts", "is_subset")
pub fn is_subset(xs: Set(a), of ys: Set(a)) -> Bool

/// Creates a new empty `Set`.
///
@external(javascript, "../set_ffi.ts", "new_set")
pub fn new() -> Set(a)

/// Gets the number of members in the given `Set`.
///
@external(javascript, "../set_ffi.ts", "size")
pub fn size(xs: Set(a)) -> Int

/// Converts the `Set` into a `List` of its members, preserving order.
///
@external(javascript, "../set_ffi.ts", "to_list")
pub fn to_list(xs: Set(a)) -> List(a)

/// Creates a new `Set` containing all members from both given sets.
///
@external(javascript, "../set_ffi.ts", "union")
pub fn union(of xs: Set(a), and ys: Set(a)) -> Set(a)
