import gleeunit
import gleeunit/should
import kindly

pub fn main() {
  gleeunit.main()
}

pub fn env_test() {
  let x = "KINDLY"
  x |> kindly.get_env |> should.equal(Error(Nil))
  let value = "💖"
  x |> kindly.set_env(value)
  x |> kindly.get_env |> should.equal(Ok(value))
  x |> kindly.unset_env
  x |> kindly.get_env |> should.equal(Error(Nil))
}
// const message = "Howdy!"

// pub fn command_test() {
//   "echo"
//   |> kindly.command(with: [message])
//   |> should.be_true()

//   ""
//   |> kindly.command(with: [])
//   |> should.be_false

//   "dimension_x"
//   |> kindly.command(with: [])
//   |> should.be_false
// }
